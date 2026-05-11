package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.GroupMessage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupMessageRepository extends JpaRepository<GroupMessage, Integer> {
    void deleteAllByUserUserId(Integer userId);
    void deleteAllByGroupGroupId(Integer groupId);
}
