package com.example.hovedopgave.dto;

public record ChatGroupResponse(
        Integer groupId,
        String name,
        String description,
        Integer memberCount,
        boolean joined,
        Integer createdByUserId,
        String createdByName,
        String lastMessagePreview,
        String lastMessageAt
) {
}
