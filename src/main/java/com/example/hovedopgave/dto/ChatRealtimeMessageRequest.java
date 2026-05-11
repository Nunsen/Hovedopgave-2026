package com.example.hovedopgave.dto;

public record ChatRealtimeMessageRequest(
        Integer userId,
        String message
) {
}
