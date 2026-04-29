package com.example.hovedopgave.dto;

public record UserRegistrationRequest(
        String fullName,
        String email,
        String phoneNumber,
        String birthDate,
        String apartmentNumber,
        String password,
        String confirmPassword
) {
}
