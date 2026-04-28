package com.example.hovedopgave.dto;

import com.example.hovedopgave.model.Booking;
import com.example.hovedopgave.model.CommunityGroup;
import com.example.hovedopgave.model.Facility;
import com.example.hovedopgave.model.Faq;
import com.example.hovedopgave.model.Post;
import com.example.hovedopgave.model.User;

import java.util.List;

public record DashboardResponse(
        List<User> users,
        List<Facility> facilities,
        List<Booking> bookings,
        List<Post> posts,
        List<CommunityGroup> groups,
        List<Faq> faqs
) {
}
