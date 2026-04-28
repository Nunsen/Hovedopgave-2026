package com.example.hovedopgave.repository;
import com.example.hovedopgave.model.WashingMachine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
@Repository
public interface WashingMachineRepository extends JpaRepository<WashingMachine, Long> {
}
