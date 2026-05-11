package com.example.hovedopgave.dto;

public record UserProfileUpdateRequest(
        String firstName,
        String lastName,
        String email,
        String phoneNumber,
        String birthDate,
        String apartmentNumber,
        String password,
        String confirmPassword
) {
}
