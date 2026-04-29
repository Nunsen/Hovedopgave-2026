package com.example.hovedopgave.dto;

public record UserResetPasswordRequest(
        String email,
        String newPassword
) {
}
