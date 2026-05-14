package com.example.hovedopgave.dto;

public record DashboardUserResponse(
        Integer userId,
        String firstName,
        String lastName,
        String email,
        String apartmentNumber,
        Boolean isActivated,
        String role
) {
}
