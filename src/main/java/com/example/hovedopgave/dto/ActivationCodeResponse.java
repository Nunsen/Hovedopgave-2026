package com.example.hovedopgave.dto;

public record ActivationCodeResponse(
        Integer userId,
        String fullName,
        String email,
        String role,
        String code,
        boolean activated,
        String message
) {
}
