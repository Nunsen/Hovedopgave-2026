package com.example.hovedopgave.dto;

public record ActivationCodeRequest(
        Integer userId,
        String code
) {
}
