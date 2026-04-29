package com.example.hovedopgave.dto;

import java.util.Map;

public record ValidationErrorResponse(
        String message,
        Map<String, String> fieldErrors
) {
}
