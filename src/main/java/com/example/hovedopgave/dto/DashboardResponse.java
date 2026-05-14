package com.example.hovedopgave.dto;

import com.example.hovedopgave.model.*;

import java.util.List;

public record DashboardResponse(
        List<User> users,
        List<Facility> facilities,
        List<Booking> bookings,
        List<Post> posts,
        List<CommunityGroup> groups,
        List<FaqRequestResponse> requests
) {
}
