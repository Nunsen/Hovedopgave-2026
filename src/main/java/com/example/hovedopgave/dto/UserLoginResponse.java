package com.example.hovedopgave.dto;

public record UserLoginResponse(
        Integer userId,
        String fullName,
        String email,
        String message
) {
}
