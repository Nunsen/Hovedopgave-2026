package com.example.hovedopgave.service;

import com.example.hovedopgave.dto.BookingAvailabilityResponse;
import com.example.hovedopgave.dto.BookingCreateRequest;
import com.example.hovedopgave.dto.BookingFacilityAvailabilityResponse;
import com.example.hovedopgave.dto.BookingResponse;
import com.example.hovedopgave.dto.BookingTimeSlotResponse;
import com.example.hovedopgave.dto.PartyRoomAvailabilityResponse;
import com.example.hovedopgave.dto.PartyRoomBookingRequest;
import com.example.hovedopgave.dto.PartyRoomDayAvailabilityResponse;
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
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class BookingService {

    private static final String WASHING_MACHINE_TYPE = "WASHING_MACHINE";
    private static final String DRYER_TYPE = "DRYER";
    private static final String PARTY_ROOM_TYPE = "PARTY_ROOM";
    private static final String OUT_OF_ORDER_STATUS = "OUT_OF_ORDER";
    private static final LocalTime FIRST_SLOT_START = LocalTime.of(7, 0);
    private static final LocalTime LAST_SLOT_END = LocalTime.of(23, 0);
    private static final LocalTime PARTY_ROOM_START = LocalTime.MIDNIGHT;
    private static final LocalTime PARTY_ROOM_END = LocalTime.of(23, 59);

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

    public BookingAvailabilityResponse getAvailability(String dateValue, Integer userId) {
        LocalDate date = parseDate(dateValue);
        List<BookingFacilityAvailabilityResponse> facilities = getLaundryFacilities().stream()
                .map(facility -> {
                    List<Booking> bookings = bookingRepository
                            .findAllByFacilityFacilityIdAndDateOrderByStartTimeAsc(facility.getFacilityId(), date);

                    return new BookingFacilityAvailabilityResponse(
                            facility.getFacilityId(),
                            facility.getName(),
                            facility.getStatus(),
                            buildSlots(bookings, userId)
                    );
                })
                .toList();

        return new BookingAvailabilityResponse(date.toString(), facilities);
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

        if (!WASHING_MACHINE_TYPE.equalsIgnoreCase(facility.getType())
                && !DRYER_TYPE.equalsIgnoreCase(facility.getType())) {
            throw new BookingValidationException(
                    "Faciliteten kan ikke bookes her.",
                    Map.of("facilityId", "Vaelg en vaskemaskine eller en toerretumbler.")
            );
        }

        ensureFacilityIsBookable(facility);

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

    public PartyRoomAvailabilityResponse getPartyRoomAvailability(String monthValue, Integer userId) {
        YearMonth month = parseMonth(monthValue);
        Facility partyRoom = getPartyRoomFacility();

        LocalDate calendarStart = month.atDay(1).with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        LocalDate calendarEnd = month.atEndOfMonth().with(TemporalAdjusters.nextOrSame(java.time.DayOfWeek.SUNDAY));

        List<Booking> bookings = bookingRepository.findAllByFacilityFacilityIdAndDateBetweenOrderByDateAsc(
                partyRoom.getFacilityId(),
                calendarStart.minusDays(3),
                calendarEnd
        );

        Map<LocalDate, Booking> bookingsByDate = new LinkedHashMap<>();
        for (Booking booking : bookings) {
            bookingsByDate.put(booking.getDate(), booking);
        }

        List<PartyRoomDayAvailabilityResponse> days = new java.util.ArrayList<>();
        LocalDate cursor = calendarStart;

        while (!cursor.isAfter(calendarEnd)) {
            Booking booking = bookingsByDate.get(cursor);
            String status = "available";
            Integer bookingId = null;
            boolean ownedByCurrentUser = false;

            if (booking != null) {
                bookingId = booking.getBookingId();
                ownedByCurrentUser = userId != null
                        && booking.getUser() != null
                        && userId.equals(booking.getUser().getUserId());
                status = ownedByCurrentUser ? "owned" : "booked";
            } else if (isBlockedByPartyRoomCooldown(cursor, bookingsByDate)) {
                status = "cooldown";
            }

            days.add(new PartyRoomDayAvailabilityResponse(
                    cursor.toString(),
                    cursor.getDayOfMonth(),
                    cursor.getMonthValue() == month.getMonthValue(),
                    status,
                    bookingId,
                    ownedByCurrentUser
            ));

            cursor = cursor.plusDays(1);
        }

        return new PartyRoomAvailabilityResponse(
                month.toString(),
                partyRoom.getFacilityId(),
                partyRoom.getName(),
                partyRoom.getStatus(),
                days
        );
    }

    public BookingResponse createPartyRoomBooking(PartyRoomBookingRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
        } else {
            if (request.userId() == null) {
                fieldErrors.put("userId", "Bruger-id er obligatorisk.");
            }

            String dateValue = normalize(request.date());
            if (dateValue == null) {
                fieldErrors.put("date", "Dato er obligatorisk.");
            } else if (!isValidDate(dateValue)) {
                fieldErrors.put("date", "Brug formatet AAAA-MM-DD.");
            }
        }

        if (!fieldErrors.isEmpty()) {
            throw new BookingValidationException("Udfyld bookingen korrekt.", fieldErrors);
        }

        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new BookingValidationException(
                        "Brugeren findes ikke.",
                        Map.of("userId", "Der findes ingen bruger med dette id.")
                ));

        Facility partyRoom = getPartyRoomFacility();
        ensureFacilityIsBookable(partyRoom);
        LocalDate date = LocalDate.parse(request.date().trim());

        if (date.isBefore(LocalDate.now())) {
            throw new BookingValidationException(
                    "Dato er ugyldig.",
                    Map.of("date", "Du kan ikke booke en tidligere dato.")
            );
        }

        boolean overlaps = bookingRepository.existsByFacilityFacilityIdAndDateAndStartTimeLessThanAndEndTimeGreaterThan(
                partyRoom.getFacilityId(),
                date,
                PARTY_ROOM_END,
                PARTY_ROOM_START
        );

        if (overlaps) {
            throw new BookingValidationException(
                    "Datoen er allerede booket.",
                    Map.of("date", "Festsalen er allerede reserveret denne dag.")
            );
        }

        List<Booking> previousBookings = bookingRepository.findAllByFacilityFacilityIdAndDateBetweenOrderByDateAsc(
                partyRoom.getFacilityId(),
                date.minusDays(3),
                date.minusDays(1)
        );

        boolean violatesCooldown = previousBookings.stream()
                .anyMatch(existingBooking -> {
                    long daysAfterExistingBooking = java.time.temporal.ChronoUnit.DAYS.between(existingBooking.getDate(), date);
                    return daysAfterExistingBooking > 0 && daysAfterExistingBooking < 4;
                });

        if (violatesCooldown) {
            throw new BookingValidationException(
                    "For kort mellem reservationer.",
                    Map.of("date", "Festsalen er i nedkoelingsperiode. Der skal gaa 3 dage efter en reservation.")
            );
        }

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setFacility(partyRoom);
        booking.setDate(date);
        booking.setStartTime(PARTY_ROOM_START);
        booking.setEndTime(PARTY_ROOM_END);
        booking.setStatus("BOOKED");
        booking.setCreatedAt(LocalDateTime.now());

        return toResponse(bookingRepository.save(booking));
    }

    public void deleteBooking(Integer bookingId, Integer userId) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (bookingId == null) {
            fieldErrors.put("bookingId", "Booking-id er obligatorisk.");
        }

        if (userId == null) {
            fieldErrors.put("userId", "Bruger-id er obligatorisk.");
        }

        if (!fieldErrors.isEmpty()) {
            throw new BookingValidationException("Kunne ikke slette bookingen.", fieldErrors);
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingValidationException(
                        "Bookingen findes ikke.",
                        Map.of("bookingId", "Der findes ingen booking med dette id.")
                ));

        User actingUser = userRepository.findById(userId)
                .orElseThrow(() -> new BookingValidationException(
                        "Brugeren findes ikke.",
                        Map.of("userId", "Der findes ingen bruger med dette id.")
                ));

        Integer bookingUserId = booking.getUser() != null ? booking.getUser().getUserId() : null;
        boolean isAdmin = actingUser.getRole() != null && actingUser.getRole().equalsIgnoreCase("ADMIN");

        if (!isAdmin && (bookingUserId == null || !bookingUserId.equals(userId))) {
            throw new BookingValidationException(
                    "Du kan kun slette dine egne bookinger.",
                    Map.of("userId", "Kun ejeren af bookingen eller en administrator kan slette den.")
            );
        }

        bookingRepository.delete(booking);
    }

    private List<BookingTimeSlotResponse> buildSlots(List<Booking> bookings, Integer userId) {
        Map<LocalTime, Booking> bookingsByStartTime = new LinkedHashMap<>();

        for (Booking booking : bookings) {
            bookingsByStartTime.put(booking.getStartTime(), booking);
        }

        List<BookingTimeSlotResponse> slots = new java.util.ArrayList<>();
        LocalTime currentTime = FIRST_SLOT_START;

        while (currentTime.isBefore(LAST_SLOT_END)) {
            LocalTime nextTime = currentTime.plusHours(2);
            Booking booking = bookingsByStartTime.get(currentTime);

            slots.add(new BookingTimeSlotResponse(
                    currentTime.toString(),
                    nextTime.toString(),
                    booking == null,
                    booking != null ? booking.getBookingId() : null,
                    booking != null
                            && userId != null
                            && booking.getUser() != null
                            && userId.equals(booking.getUser().getUserId())
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
                fieldErrors.put("startTime", "Vasketider skal ligge mellem 07:00 og 23:00.");
            }

            if (!parsedStartTime.plusHours(2).equals(parsedEndTime)) {
                fieldErrors.put("endTime", "En vasketid varer 2 timer.");
            }
        }

        return fieldErrors;
    }

    private List<Facility> getLaundryFacilities() {
        List<Facility> washingMachines = facilityRepository.findAllByTypeIgnoreCaseOrderByNameAsc(WASHING_MACHINE_TYPE);
        List<Facility> dryers = facilityRepository.findAllByTypeIgnoreCaseOrderByNameAsc(DRYER_TYPE);

        List<Facility> facilities = new java.util.ArrayList<>();
        facilities.addAll(washingMachines);
        facilities.addAll(dryers);

        if (facilities.isEmpty()) {
            throw new BookingValidationException(
                    "Vaskeriet findes ikke.",
                    Map.of("facility", "Der er ikke oprettet vaskefaciliteter i databasen.")
            );
        }

        return facilities;
    }

    private Facility getPartyRoomFacility() {
        return facilityRepository.findFirstByTypeIgnoreCase(PARTY_ROOM_TYPE)
                .orElseThrow(() -> new BookingValidationException(
                        "Festsalen findes ikke.",
                        Map.of("facility", "Der er ikke oprettet en festsal i databasen.")
                ));
    }

    private boolean isBlockedByPartyRoomCooldown(LocalDate date, Map<LocalDate, Booking> bookingsByDate) {
        return bookingsByDate.keySet().stream()
                .anyMatch(existingDate -> {
                    long daysAfterExistingBooking = java.time.temporal.ChronoUnit.DAYS.between(existingDate, date);
                    return daysAfterExistingBooking > 0 && daysAfterExistingBooking < 4;
                });
    }

    private void ensureFacilityIsBookable(Facility facility) {
        String facilityStatus = facility.getStatus() == null ? "" : facility.getStatus().trim().toUpperCase();

        if (OUT_OF_ORDER_STATUS.equals(facilityStatus)) {
            throw new BookingValidationException(
                    "Faciliteten er ude af drift.",
                    Map.of("facilityId", "Faciliteten kan ikke bookes, mens den er ude af drift.")
            );
        }
    }

    private YearMonth parseMonth(String value) {
        String normalizedValue = normalize(value);

        if (normalizedValue == null) {
            throw new BookingValidationException(
                    "Maaned er ugyldig.",
                    Map.of("month", "Brug formatet AAAA-MM.")
            );
        }

        try {
            return YearMonth.parse(normalizedValue);
        } catch (DateTimeParseException exception) {
            throw new BookingValidationException(
                    "Maaned er ugyldig.",
                    Map.of("month", "Brug formatet AAAA-MM.")
            );
        }
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
