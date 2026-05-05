package com.example.hovedopgave.service;

import com.example.hovedopgave.dto.BookingAvailabilityResponse;
import com.example.hovedopgave.dto.BookingCreateRequest;
import com.example.hovedopgave.dto.BookingResponse;
import com.example.hovedopgave.dto.BookingTimeSlotResponse;
import com.example.hovedopgave.model.Booking;
import com.example.hovedopgave.model.Facility;
import com.example.hovedopgave.model.User;
import com.example.hovedopgave.repository.BookingRepository;
import com.example.hovedopgave.repository.FacilityRepository;
import com.example.hovedopgave.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class BookingService {

    private static final String WASHING_FACILITY_TYPE = "WASHING_ROOM";
    private static final LocalTime FIRST_SLOT_START = LocalTime.of(8, 0);
    private static final LocalTime LAST_SLOT_END = LocalTime.of(20, 0);

    private final BookingRepository bookingRepository;
    private final FacilityRepository facilityRepository;
    private final UserRepository userRepository;

    public BookingService(
            BookingRepository bookingRepository,
            FacilityRepository facilityRepository,
            UserRepository userRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.facilityRepository = facilityRepository;
        this.userRepository = userRepository;
    }

    public List<BookingResponse> getBookings(Integer userId) {
        List<Booking> bookings = userId != null
                ? bookingRepository.findByUserUserId(userId)
                : bookingRepository.findAll();

        return bookings.stream()
                .map(this::toResponse)
                .toList();
    }

    public BookingAvailabilityResponse getAvailability(String dateValue) {
        LocalDate date = parseDate(dateValue);
        Facility facility = getWashingFacility();
        List<Booking> bookings = bookingRepository
                .findAllByFacilityFacilityIdAndDateOrderByStartTimeAsc(facility.getFacilityId(), date);

        List<BookingTimeSlotResponse> slots = buildSlots(bookings);

        return new BookingAvailabilityResponse(
                date.toString(),
                facility.getFacilityId(),
                facility.getName(),
                slots
        );
    }

    public BookingResponse createBooking(BookingCreateRequest request) {
        Map<String, String> fieldErrors = validateCreateRequest(request);

        if (!fieldErrors.isEmpty()) {
            throw new BookingValidationException("Udfyld bookingen korrekt.", fieldErrors);
        }

        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new BookingValidationException(
                        "Brugeren findes ikke.",
                        Map.of("userId", "Der findes ingen bruger med dette id.")
                ));

        Facility facility = facilityRepository.findById(request.facilityId())
                .orElseThrow(() -> new BookingValidationException(
                        "Faciliteten findes ikke.",
                        Map.of("facilityId", "Der findes ingen facilitet med dette id.")
                ));

        LocalDate date = LocalDate.parse(request.date().trim());
        LocalTime startTime = LocalTime.parse(request.startTime().trim());
        LocalTime endTime = LocalTime.parse(request.endTime().trim());

        boolean overlaps = bookingRepository.existsByFacilityFacilityIdAndDateAndStartTimeLessThanAndEndTimeGreaterThan(
                facility.getFacilityId(),
                date,
                endTime,
                startTime
        );

        if (overlaps) {
            throw new BookingValidationException(
                    "Tiden er allerede optaget.",
                    Map.of("startTime", "Vaelg en ledig tid.")
            );
        }

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setFacility(facility);
        booking.setDate(date);
        booking.setStartTime(startTime);
        booking.setEndTime(endTime);
        booking.setStatus("BOOKED");
        booking.setCreatedAt(LocalDateTime.now());

        Booking savedBooking = bookingRepository.save(booking);
        return toResponse(savedBooking);
    }

    private List<BookingTimeSlotResponse> buildSlots(List<Booking> bookings) {
        Map<LocalTime, Booking> bookingsByStartTime = new LinkedHashMap<>();

        for (Booking booking : bookings) {
            bookingsByStartTime.put(booking.getStartTime(), booking);
        }

        List<BookingTimeSlotResponse> slots = new java.util.ArrayList<>();
        LocalTime currentTime = FIRST_SLOT_START;

        while (currentTime.isBefore(LAST_SLOT_END)) {
            LocalTime nextTime = currentTime.plusHours(1);
            Booking booking = bookingsByStartTime.get(currentTime);

            slots.add(new BookingTimeSlotResponse(
                    currentTime.toString(),
                    nextTime.toString(),
                    booking == null,
                    booking != null ? booking.getBookingId() : null
            ));

            currentTime = nextTime;
        }

        return slots;
    }

    private Map<String, String> validateCreateRequest(BookingCreateRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
            return fieldErrors;
        }

        if (request.userId() == null) {
            fieldErrors.put("userId", "Bruger-id er obligatorisk.");
        }

        if (request.facilityId() == null) {
            fieldErrors.put("facilityId", "Facility-id er obligatorisk.");
        }

        String date = normalize(request.date());
        String startTime = normalize(request.startTime());
        String endTime = normalize(request.endTime());

        if (date == null) {
            fieldErrors.put("date", "Dato er obligatorisk.");
        } else if (!isValidDate(date)) {
            fieldErrors.put("date", "Brug formatet AAAA-MM-DD.");
        }

        if (startTime == null) {
            fieldErrors.put("startTime", "Starttidspunkt er obligatorisk.");
        } else if (!isValidTime(startTime)) {
            fieldErrors.put("startTime", "Brug formatet TT:MM.");
        }

        if (endTime == null) {
            fieldErrors.put("endTime", "Sluttidspunkt er obligatorisk.");
        } else if (!isValidTime(endTime)) {
            fieldErrors.put("endTime", "Brug formatet TT:MM.");
        }

        if (startTime != null && endTime != null && isValidTime(startTime) && isValidTime(endTime)) {
            LocalTime parsedStartTime = LocalTime.parse(startTime);
            LocalTime parsedEndTime = LocalTime.parse(endTime);

            if (!parsedEndTime.isAfter(parsedStartTime)) {
                fieldErrors.put("endTime", "Sluttidspunkt skal vaere efter starttidspunkt.");
            }

            if (parsedStartTime.isBefore(FIRST_SLOT_START) || parsedEndTime.isAfter(LAST_SLOT_END)) {
                fieldErrors.put("startTime", "Vasketider skal ligge mellem 08:00 og 20:00.");
            }

            if (!parsedStartTime.plusHours(1).equals(parsedEndTime)) {
                fieldErrors.put("endTime", "En vasketid varer 1 time.");
            }
        }

        return fieldErrors;
    }

    private Facility getWashingFacility() {
        return facilityRepository.findFirstByTypeIgnoreCase(WASHING_FACILITY_TYPE)
                .orElseThrow(() -> new BookingValidationException(
                        "Vaskeriet findes ikke.",
                        Map.of("facility", "Der er ikke oprettet et vaskeri i databasen.")
                ));
    }

    private LocalDate parseDate(String value) {
        String normalizedValue = normalize(value);

        if (normalizedValue == null || !isValidDate(normalizedValue)) {
            throw new BookingValidationException(
                    "Dato er ugyldig.",
                    Map.of("date", "Brug formatet AAAA-MM-DD.")
            );
        }

        return LocalDate.parse(normalizedValue);
    }

    private BookingResponse toResponse(Booking booking) {
        return new BookingResponse(
                booking.getBookingId(),
                booking.getUser() != null ? booking.getUser().getUserId() : null,
                booking.getFacility() != null ? booking.getFacility().getFacilityId() : null,
                booking.getFacility() != null ? booking.getFacility().getName() : null,
                booking.getDate() != null ? booking.getDate().toString() : null,
                booking.getStartTime() != null ? booking.getStartTime().toString() : null,
                booking.getEndTime() != null ? booking.getEndTime().toString() : null,
                booking.getStatus(),
                booking.getCreatedAt() != null ? booking.getCreatedAt().toString() : null
        );
    }

    private boolean isValidDate(String value) {
        try {
            LocalDate.parse(value);
            return true;
        } catch (DateTimeParseException exception) {
            return false;
        }
    }

    private boolean isValidTime(String value) {
        try {
            LocalTime.parse(value);
            return true;
        } catch (DateTimeParseException exception) {
            return false;
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }

    public static class BookingValidationException extends RuntimeException {
        private final Map<String, String> fieldErrors;

        public BookingValidationException(String message, Map<String, String> fieldErrors) {
            super(message);
            this.fieldErrors = fieldErrors;
        }

        public Map<String, String> getFieldErrors() {
            return fieldErrors;
        }
    }
}
