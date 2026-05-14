package com.example.hovedopgave.controller;

import com.example.hovedopgave.dto.DashboardResponse;
import com.example.hovedopgave.repository.*;
import com.example.hovedopgave.service.FaqRequestService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final UserRepository userRepository;
    private final FacilityRepository facilityRepository;
    private final BookingRepository bookingRepository;
    private final PostRepository postRepository;
    private final CommunityGroupRepository communityGroupRepository;
    private final FaqRequestService faqRequestService;

    public DashboardController(
            UserRepository userRepository,
            FacilityRepository facilityRepository,
            BookingRepository bookingRepository,
            PostRepository postRepository,
            CommunityGroupRepository communityGroupRepository,
            FaqRequestService faqRequestService
    ) {
        this.userRepository = userRepository;
        this.facilityRepository = facilityRepository;
        this.bookingRepository = bookingRepository;
        this.postRepository = postRepository;
        this.communityGroupRepository = communityGroupRepository;
        this.faqRequestService = faqRequestService;
    }

    @GetMapping
    public DashboardResponse getDashboard() {
        return new DashboardResponse(
                userRepository.findAll(),
                facilityRepository.findAll(),
                bookingRepository.findAll(),
                postRepository.findAll(),
                communityGroupRepository.findAll(),
                faqRequestService.getRequests()
        );
    }
}
