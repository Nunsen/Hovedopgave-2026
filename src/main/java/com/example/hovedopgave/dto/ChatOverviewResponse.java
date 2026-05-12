package com.example.hovedopgave.dto;

import java.util.List;

public record ChatOverviewResponse(
        List<ChatGroupResponse> directConversations,
        List<ChatGroupResponse> joinedGroups,
        List<ChatGroupResponse> availableGroups
) {
}
