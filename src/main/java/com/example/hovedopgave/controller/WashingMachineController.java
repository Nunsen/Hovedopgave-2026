package com.example.hovedopgave.controller;

import com.example.hovedopgave.repository.WashingMachineRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/washingMachines")
public class WashingMachineController {
    @Autowired
    private WashingMachineRepository washingMachineRepo;
}
