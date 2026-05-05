package com.example.hovedopgave.dto;

import java.util.List;

public record PostResponse(
        Integer postId,
        Integer userId,
        String title,
        String content,
        String category,
        String icon,
        String eventDate,
        String startTime,
        String endTime,
        String location,
        String createdAt,
        boolean pinned,
        long participantCount,
        Boolean attending,
        List<CommentResponse> comments
) {
}
