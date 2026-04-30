package com.example.hovedopgave.dto;

public record CommentCreateRequest(
        Integer userId,
        String content
) {
}
