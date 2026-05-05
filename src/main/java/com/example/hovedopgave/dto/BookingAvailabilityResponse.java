package com.example.hovedopgave.dto;

import java.util.List;

public record BookingAvailabilityResponse(
        String date,
        Integer facilityId,
        String facilityName,
        List<BookingTimeSlotResponse> slots
) {
}
