package com.example.hovedopgave.repository;

import com.example.hovedopgave.model.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Integer> {
    boolean existsByGroupGroupIdAndUserUserId(Integer groupId, Integer userId);
    java.util.Optional<GroupMember> findByGroupGroupIdAndUserUserId(Integer groupId, Integer userId);
    java.util.List<GroupMember> findAllByUserUserIdOrderByJoinedAtDesc(Integer userId);
    java.util.List<GroupMember> findAllByGroupGroupIdOrderByJoinedAtAsc(Integer groupId);
    java.util.List<GroupMember> findAllByGroupGroupId(Integer groupId);
    long countByGroupGroupId(Integer groupId);
    void deleteAllByUserUserId(Integer userId);
    void deleteAllByGroupGroupId(Integer groupId);
}
