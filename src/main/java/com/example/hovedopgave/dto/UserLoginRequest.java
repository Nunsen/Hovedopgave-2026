package com.example.hovedopgave.dto;

public record UserLoginRequest(
        String email,
        String password
) {
}
