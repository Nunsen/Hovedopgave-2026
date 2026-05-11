package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Integer> {
    boolean existsByGroupGroupIdAndUserUserId(Integer groupId, Integer userId);
    java.util.List<GroupMember> findAllByUserUserIdOrderByJoinedAtDesc(Integer userId);
    long countByGroupGroupId(Integer groupId);
    void deleteAllByUserUserId(Integer userId);
    void deleteAllByGroupGroupId(Integer groupId);
}
