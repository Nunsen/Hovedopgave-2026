package com.example.hovedopgave.dto;

import java.util.List;

public record PartyRoomAvailabilityResponse(
        String month,
        Integer facilityId,
        String facilityName,
        List<PartyRoomDayAvailabilityResponse> days
) {
}
