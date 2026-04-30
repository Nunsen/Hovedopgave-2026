package com.example.hovedopgave.dto;

public record PostCreateRequest(
        Integer userId,
        String title,
        String eventDate,
        String category,
        String content,
        String icon,
        Boolean pinned
) {
}
