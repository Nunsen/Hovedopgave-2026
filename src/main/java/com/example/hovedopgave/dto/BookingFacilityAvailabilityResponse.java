package com.example.hovedopgave.dto;

import java.util.List;

public record BookingFacilityAvailabilityResponse(
        Integer facilityId,
        String facilityName,
        List<BookingTimeSlotResponse> slots
) {
}
