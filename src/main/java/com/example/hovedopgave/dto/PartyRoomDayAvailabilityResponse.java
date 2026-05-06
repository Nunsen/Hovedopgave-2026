package com.example.hovedopgave.dto;

public record PartyRoomDayAvailabilityResponse(
        String date,
        int dayOfMonth,
        boolean inCurrentMonth,
        String status,
        Integer bookingId,
        boolean ownedByCurrentUser
) {
}
