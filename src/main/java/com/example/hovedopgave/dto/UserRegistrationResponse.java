package com.example.hovedopgave.dto;

public record UserRegistrationResponse(
        Integer userId,
        String fullName,
        String email,
        String nextStep
) {
}
