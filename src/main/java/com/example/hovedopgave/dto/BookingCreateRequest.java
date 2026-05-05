package com.example.hovedopgave.dto;

public record BookingCreateRequest(
        Integer userId,
        Integer facilityId,
        String date,
        String startTime,
        String endTime
) {
}
