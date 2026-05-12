package com.example.hovedopgave.dto;

public record ChatDirectConversationRequest(
        Integer userId,
        Integer targetUserId
) {
}
