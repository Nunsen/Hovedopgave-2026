package com.example.hovedopgave.service;

import com.example.hovedopgave.dto.FacilityResponse;
import com.example.hovedopgave.dto.FacilityStatusUpdateRequest;
import com.example.hovedopgave.model.Facility;
import com.example.hovedopgave.repository.BookingRepository;
import com.example.hovedopgave.repository.FacilityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class FacilityService {
    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_OUT_OF_ORDER = "OUT_OF_ORDER";

    private final FacilityRepository facilityRepository;
    private final BookingRepository bookingRepository;

    public FacilityService(FacilityRepository facilityRepository, BookingRepository bookingRepository) {
        this.facilityRepository = facilityRepository;
        this.bookingRepository = bookingRepository;
    }

    public List<FacilityResponse> getAllFacilities() {
        return facilityRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public FacilityResponse updateFacilityStatus(Integer facilityId, FacilityStatusUpdateRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        if (facilityId == null) {
            fieldErrors.put("facilityId", "Facility-id er obligatorisk.");
        }

        if (request == null) {
            fieldErrors.put("request", "Request body mangler.");
        } else {
            String normalizedStatus = normalizeStatus(request.status());

            if (normalizedStatus == null) {
                fieldErrors.put("status", "Status er obligatorisk.");
            } else if (!isSupportedStatus(normalizedStatus)) {
                fieldErrors.put("status", "Status skal vaere ACTIVE eller OUT_OF_ORDER.");
            }
        }

        if (!fieldErrors.isEmpty()) {
            throw new FacilityValidationException("Kunne ikke opdatere faciliteten.", fieldErrors);
        }

        Facility facility = facilityRepository.findById(facilityId)
                .orElseThrow(() -> new FacilityValidationException(
                        "Faciliteten findes ikke.",
                        Map.of("facilityId", "Der findes ingen facilitet med dette id.")
                ));

        String nextStatus = normalizeStatus(request.status());
        facility.setStatus(nextStatus);

        if (STATUS_OUT_OF_ORDER.equals(nextStatus)) {
            bookingRepository.deleteAllByFacilityFacilityId(facilityId);
        }

        Facility savedFacility = facilityRepository.save(facility);
        return toResponse(savedFacility);
    }

    private FacilityResponse toResponse(Facility facility) {
        return new FacilityResponse(
                facility.getFacilityId(),
                facility.getName(),
                facility.getType(),
                facility.getStatus()
        );
    }

    private boolean isSupportedStatus(String status) {
        return STATUS_ACTIVE.equals(status)
                || STATUS_OUT_OF_ORDER.equals(status);
    }

    private String normalizeStatus(String status) {
        if (status == null) {
            return null;
        }

        String trimmedStatus = status.trim();
        return trimmedStatus.isEmpty() ? null : trimmedStatus.toUpperCase();
    }

    public static class FacilityValidationException extends RuntimeException {
        private final Map<String, String> fieldErrors;

        public FacilityValidationException(String message, Map<String, String> fieldErrors) {
            super(message);
            this.fieldErrors = fieldErrors;
        }

        public Map<String, String> getFieldErrors() {
            return fieldErrors;
        }
    }
}
