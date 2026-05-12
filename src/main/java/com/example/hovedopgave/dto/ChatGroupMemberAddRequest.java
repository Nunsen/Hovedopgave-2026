package com.example.hovedopgave.dto;

import java.util.List;

public record ChatGroupMemberAddRequest(
        Integer userId,
        List<Integer> memberUserIds
) {
}
