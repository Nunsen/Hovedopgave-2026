package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.CommunityGroup;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityGroupRepository extends JpaRepository<CommunityGroup, Integer> {
    java.util.List<CommunityGroup> findAllByCreatedByUserId(Integer userId);
}
