package com.example.hovedopgave.dto;

import java.util.List;

public record BookingAvailabilityResponse(
        String date,
        List<BookingFacilityAvailabilityResponse> facilities
) {
}
