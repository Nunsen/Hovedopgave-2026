package com.example.hovedopgave.dto;

public record FaqInquiryRequest(
        Integer userId,
        String category,
        String title,
        String description
) {
}
