package com.example.hovedopgave.dto;

public record PostParticipationRequest(
        Integer userId,
        Boolean attending
) {
}
