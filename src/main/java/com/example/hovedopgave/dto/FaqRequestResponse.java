package com.example.hovedopgave.dto;

public record FaqRequestResponse(
        Integer faqRequestId,
        DashboardUserResponse user,
        String category,
        String title,
        String description,
        String contactEmail,
        String status,
        String createdAt
) {
}
