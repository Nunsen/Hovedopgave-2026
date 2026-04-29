package com.example.hovedopgave.dto;

public record ActivationCodeResponse(
        Integer userId,
        String code,
        boolean activated,
        String message
) {
}
