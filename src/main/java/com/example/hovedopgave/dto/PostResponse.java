package com.example.hovedopgave.dto;

public record PostResponse(
        Integer postId,
        Integer userId,
        String title,
        String content,
        String category,
        String icon,
        String eventDate,
        String createdAt,
        boolean pinned
) {
}
