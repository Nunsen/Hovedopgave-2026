package com.example.hovedopgave.dto;

public record ChatMessageResponse(
        Integer messageId,
        Integer groupId,
        Integer userId,
        String authorName,
        String message,
        String sentAt
) {
}
