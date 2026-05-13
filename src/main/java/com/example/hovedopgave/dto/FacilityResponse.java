package com.example.hovedopgave.dto;

public record FacilityResponse(
        Integer facilityId,
        String name,
        String type,
        String status
) {
}
