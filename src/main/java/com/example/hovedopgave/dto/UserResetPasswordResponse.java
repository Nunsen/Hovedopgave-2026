package com.example.hovedopgave.dto;

public record UserResetPasswordResponse(
        String email,
        String message
) {
}
