package com.example.hovedopgave.dto;

public record FaqRequestCreateRequest(
        Integer userId,
        String category,
        String title,
        String description
) {
}
