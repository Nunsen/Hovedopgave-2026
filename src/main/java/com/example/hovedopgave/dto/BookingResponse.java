package com.example.hovedopgave.dto;

public record BookingResponse(
        Integer bookingId,
        Integer userId,
        Integer facilityId,
        String facilityName,
        String date,
        String startTime,
        String endTime,
        String status,
        String createdAt
) {
}
