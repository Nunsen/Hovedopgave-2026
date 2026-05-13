package com.example.hovedopgave.dto;

public record FaqResponse(
        Integer faqId,
        String question,
        String answer,
        String category
) {
}
