package com.example.hovedopgave.dto;

import java.util.List;

public record BookingFacilityAvailabilityResponse(
        Integer facilityId,
        String facilityName,
        String facilityStatus,
        List<BookingTimeSlotResponse> slots
) {
}
