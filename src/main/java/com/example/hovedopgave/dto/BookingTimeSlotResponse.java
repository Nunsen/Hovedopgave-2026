package com.example.hovedopgave.dto;

public record BookingTimeSlotResponse(
        String startTime,
        String endTime,
        boolean available,
        Integer bookingId,
        boolean ownedByCurrentUser
) {
}
