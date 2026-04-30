package com.example.hovedopgave.dto;

public record CommentResponse(
        Integer commentId,
        Integer userId,
        String authorName,
        String content,
        String createdAt
) {
}
