package com.example.hovedopgave.dto;

public record ChatGroupCreateRequest(
        Integer userId,
        String name,
        String description
) {
}
