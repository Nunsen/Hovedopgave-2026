package com.example.hovedopgave.dto;

public record ChatMessageRequest(
        Integer userId,
        String message
) {
}
