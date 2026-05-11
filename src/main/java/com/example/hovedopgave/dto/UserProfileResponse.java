package com.example.hovedopgave.dto;

public record UserProfileResponse(
        Integer userId,
        String firstName,
        String lastName,
        String fullName,
        String email,
        String phoneNumber,
        String birthDate,
        String apartmentNumber,
        String password
) {
}
