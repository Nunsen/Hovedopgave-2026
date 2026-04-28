package com.example.hovedopgave.controller;

import com.example.hovedopgave.model.CommunityGroup;
import com.example.hovedopgave.repository.CommunityGroupRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final CommunityGroupRepository communityGroupRepository;

    public GroupController(CommunityGroupRepository communityGroupRepository) {
        this.communityGroupRepository = communityGroupRepository;
    }

    @GetMapping
    public List<CommunityGroup> getGroups() {
        return communityGroupRepository.findAll();
    }
}
