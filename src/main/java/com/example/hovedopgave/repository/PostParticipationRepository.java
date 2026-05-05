package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.PostParticipation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PostParticipationRepository extends JpaRepository<PostParticipation, Integer> {
    long countByPostPostIdAndIsAttendingTrue(Integer postId);
    Optional<PostParticipation> findByPostPostIdAndUserUserId(Integer postId, Integer userId);
    void deleteAllByPostPostId(Integer postId);
}
